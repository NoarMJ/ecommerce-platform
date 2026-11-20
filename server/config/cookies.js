const GUEST_CART_COOKIE = 'guestCartToken';


const isProduction =  process.env.NODE_ENV ==='production';

const guestCartCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none':'lax' ,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
};

const { maxAge, ...guestCartClearOptions }= guestCartCookieOptions;

module.exports = {
    GUEST_CART_COOKIE,
    guestCartCookieOptions,
    guestCartClearOptions,  
};