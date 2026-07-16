<?php
/**
 * Plugin Name: Indhu CRM Online Leads
 * Description: Sends Contact Form 7 enquiries from indhuinfra.com to Nova CRM online leads.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

const INDHU_CRM_API_URL = 'https://your-crm-api.example.com/api/online-leads';
const INDHU_CRM_COMPANY = 'INDHU Infra';
const INDHU_CRM_SOURCE = 'indhuinfra.com Contact Form 7';

add_action('wpcf7_mail_sent', function ($contact_form) {
    if (!class_exists('WPCF7_Submission')) {
        return;
    }

    $submission = WPCF7_Submission::get_instance();
    if (!$submission) {
        return;
    }

    $data = $submission->get_posted_data();
    $payload = [
        'company' => INDHU_CRM_COMPANY,
        'name' => sanitize_text_field($data['your-name'] ?? $data['name'] ?? ''),
        'email' => sanitize_email($data['your-email'] ?? $data['email'] ?? ''),
        'phone' => sanitize_text_field($data['Phone'] ?? $data['phone'] ?? ''),
        'message' => sanitize_textarea_field($data['your-message'] ?? $data['message'] ?? ''),
        'project' => get_bloginfo('name') ?: 'Website enquiry',
        'source' => INDHU_CRM_SOURCE,
    ];

    if (!$payload['name'] && !$payload['email'] && !$payload['phone']) {
        return;
    }

    $response = wp_remote_post(INDHU_CRM_API_URL, [
        'timeout' => 10,
        'headers' => [
            'Content-Type' => 'application/json',
        ],
        'body' => wp_json_encode($payload),
    ]);

    if (is_wp_error($response)) {
        error_log('Indhu CRM lead sync failed: ' . $response->get_error_message());
        return;
    }

    $status = wp_remote_retrieve_response_code($response);
    if ($status < 200 || $status >= 300) {
        error_log('Indhu CRM lead sync failed with HTTP ' . $status . ': ' . wp_remote_retrieve_body($response));
    }
});
