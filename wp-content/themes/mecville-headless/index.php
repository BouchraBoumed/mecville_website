<?php
// Headless theme - redirects all front-end traffic to the React app
$react_app_url = 'http://localhost:5173';
$request_uri = $_SERVER['REQUEST_URI'] ?? '/';

// Don't redirect API requests, admin, or wp-json
if (
    strpos($request_uri, '/wp-json') === 0 ||
    strpos($request_uri, '/wp-admin') === 0 ||
    strpos($request_uri, '/wc-api') === 0 ||
    strpos($request_uri, '/wc-ajax') === 0 ||
    is_admin()
) {
    return;
}

// Redirect all other requests to React app
header('Location: ' . $react_app_url . $request_uri, true, 302);
exit;
