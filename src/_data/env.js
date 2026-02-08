require('dotenv').config();

module.exports = {
    SERVER_URL: process.env.SERVER_URL || 'https://uigmdykavqllplgdxtxs.supabase.co/functions/v1/licensing',
    RAZORPAY_KEY: process.env.RAZORPAY_KEY || 'PLACEHOLDER_KEY',
    AMOUNT: process.env.AMOUNT || '500000'
};
