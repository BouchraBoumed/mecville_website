<?php
add_action('after_setup_theme', function () {
    add_theme_support('woocommerce');
    add_theme_support('title-tag');
});

// Enable CORS for React app
add_action('init', function () {
    header('Access-Control-Allow-Origin: http://localhost:5173');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WC-Store-API-Nonce');
});

// Handle OPTIONS preflight requests
add_action('init', function () {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('Access-Control-Allow-Origin: http://localhost:5173');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');
        header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WC-Store-API-Nonce');
        exit;
    }
});
