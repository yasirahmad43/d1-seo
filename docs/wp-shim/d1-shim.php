<?php
/**
 * D1 SEO Dashboard — WordPress shim
 *
 * Paste this into WPCode → Add Snippet → "PHP Snippet" → run on every page.
 * Exposes 3 read-only endpoints behind a shared-secret header that the D1
 * dashboard polls every 30 minutes. No data leaves WordPress unless the
 * caller sends the matching secret.
 *
 *   GET /wp-json/d1/v1/ping
 *   GET /wp-json/d1/v1/submissions?since=<unix-timestamp>
 *   GET /wp-json/d1/v1/wpcode-snippets
 *
 * Auth: header `X-D1-Token: <SHARED_SECRET>`.
 *
 * Set the secret here — must match the value stored in the dashboard's
 * `integrations.credentials.shim_token` for this client.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'D1_SHIM_TOKEN', 'REPLACE_WITH_RANDOM_32_CHAR_SECRET' );

add_action( 'rest_api_init', function () {

    $auth_cb = function ( $request ) {
        $token = $request->get_header( 'x-d1-token' );
        if ( ! $token || ! hash_equals( D1_SHIM_TOKEN, $token ) ) {
            return new WP_Error( 'd1_unauthorized', 'invalid token', array( 'status' => 401 ) );
        }
        return true;
    };

    register_rest_route( 'd1/v1', '/ping', array(
        'methods'             => 'GET',
        'permission_callback' => $auth_cb,
        'callback'            => function () {
            return array( 'ok' => true, 'site' => home_url(), 'time' => current_time( 'c' ) );
        },
    ) );

    register_rest_route( 'd1/v1', '/submissions', array(
        'methods'             => 'GET',
        'permission_callback' => $auth_cb,
        'args'                => array(
            'since' => array( 'type' => 'integer', 'default' => 0 ),
            'limit' => array( 'type' => 'integer', 'default' => 200 ),
        ),
        'callback'            => 'd1_get_submissions',
    ) );

    register_rest_route( 'd1/v1', '/wpcode-snippets', array(
        'methods'             => 'GET',
        'permission_callback' => $auth_cb,
        'callback'            => 'd1_get_wpcode_snippets',
    ) );
} );

/**
 * Returns rows from Elementor's wp_e_submissions table, with their associated
 * field values flattened into a per-submission object. Includes the 10
 * attribution fields if they were captured.
 */
function d1_get_submissions( WP_REST_Request $req ) {
    global $wpdb;

    $since = (int) $req->get_param( 'since' );
    $limit = max( 1, min( 500, (int) $req->get_param( 'limit' ) ?: 200 ) );

    $subs_table   = $wpdb->prefix . 'e_submissions';
    $values_table = $wpdb->prefix . 'e_submissions_values';

    $tables_exist = (bool) $wpdb->get_var( $wpdb->prepare(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = %s",
        $subs_table
    ) );
    if ( ! $tables_exist ) {
        return array( 'ok' => false, 'reason' => 'elementor_submissions_table_missing', 'submissions' => array() );
    }

    $since_dt = $since > 0 ? gmdate( 'Y-m-d H:i:s', $since ) : '1970-01-01 00:00:00';

    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT id, form_name, form_id, post_id, referer, user_agent, user_ip,
                created_at, updated_at
         FROM {$subs_table}
         WHERE updated_at >= %s
         ORDER BY id DESC
         LIMIT %d",
        $since_dt, $limit
    ), ARRAY_A );

    if ( ! $rows ) return array( 'ok' => true, 'submissions' => array() );

    $ids = array_map( fn( $r ) => (int) $r['id'], $rows );
    $placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );

    $values = $wpdb->get_results( $wpdb->prepare(
        "SELECT submission_id, `key`, value FROM {$values_table} WHERE submission_id IN ($placeholders)",
        ...$ids
    ), ARRAY_A );

    $by_sub = array();
    foreach ( $values as $v ) {
        $by_sub[ (int) $v['submission_id'] ][ $v['key'] ] = $v['value'];
    }

    $out = array();
    foreach ( $rows as $r ) {
        $fields = $by_sub[ (int) $r['id'] ] ?? array();
        $out[] = array(
            'id'         => (int) $r['id'],
            'form_name'  => $r['form_name'],
            'form_id'    => $r['form_id'],
            'post_id'    => (int) $r['post_id'],
            'permalink'  => $r['post_id'] ? get_permalink( $r['post_id'] ) : null,
            'referer'    => $r['referer'],
            'user_ip'    => $r['user_ip'],
            'created_at' => mysql_to_rfc3339( $r['created_at'] ),
            'updated_at' => mysql_to_rfc3339( $r['updated_at'] ),
            'fields'     => $fields,
        );
    }

    return array(
        'ok'          => true,
        'count'       => count( $out ),
        'now'         => time(),
        'submissions' => $out,
    );
}

/**
 * WPCode snippet metadata — id, title, active state, modified time.
 * No source code returned.
 */
function d1_get_wpcode_snippets( WP_REST_Request $req ) {
    if ( ! post_type_exists( 'wpcode' ) ) {
        return array( 'ok' => false, 'reason' => 'wpcode_missing', 'snippets' => array() );
    }
    $posts = get_posts( array(
        'post_type'      => 'wpcode',
        'post_status'    => array( 'publish', 'draft' ),
        'numberposts'    => 500,
        'orderby'        => 'modified',
        'order'          => 'DESC',
    ) );
    $out = array();
    foreach ( $posts as $p ) {
        $active = get_post_meta( $p->ID, '_wpcode_active', true );
        $out[] = array(
            'id'          => $p->ID,
            'title'       => $p->post_title,
            'active'      => (bool) $active,
            'modified_at' => mysql_to_rfc3339( $p->post_modified_gmt ),
        );
    }
    return array( 'ok' => true, 'count' => count( $out ), 'snippets' => $out );
}
