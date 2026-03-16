// Type definitions for js-cookie
// Project: https://github.com/js-cookie/js-cookie
// Definitions by: Theodore Brown <https://github.com/theodorejb>
//                 BendingBender <https://github.com/BendingBender>
//                 Antoine Lépée <https://github.com/alepee>
//                 Yuto Doi <https://github.com/yutod>

declare namespace Cookies {
  interface CookieAttributes {
    /**
     * Define when the cookie will be removed. Value can be a Number
     * which will be interpreted as days from time of creation or a
     * Date instance. If omitted, the cookie becomes a session cookie.
     */
    expires?: number | Date | undefined;

    /**
     * Define the path where the cookie is available. Defaults to '/'
     */
    path?: string | undefined;

    /**
     * Define the domain where the cookie is available. Defaults to
     * the domain of the page where the cookie was created.
     */
    domain?: string | undefined;

    /**
     * A Boolean indicating if the cookie transmission requires a
     * secure protocol (https). Defaults to false.
     */
    secure?: boolean | undefined;

    /**
     * Asserts that a cookie must not be sent with cross-origin requests,
     * providing some protection against cross-site request forgery
     * attacks (CSRF)
     */
    sameSite?: 'strict' | 'Strict' | 'lax' | 'Lax' | 'none' | 'None' | undefined;

    /**
     * An attribute which will be serialized, conformably to RFC 6265
     * section 5.2.
     */
    [property: string]: any;
  }

  interface CookiesStatic {
    /**
     * Allows you to define the attributes that will be assigned to all cookies created or accessed by js-cookie
     */
    defaults: CookieAttributes;

    /**
     * Create a cookie
     */
    set(name: string, value: string | object, options?: CookieAttributes): string | undefined;

    /**
     * Read cookie
     */
    get(name: string): string | undefined;

    /**
     * Read all available cookies
     */
    get(): {[key: string]: string};

    /**
     * Delete cookie
     */
    remove(name: string, options?: CookieAttributes): void;

    /**
     * Create a new instance of the api that overrides the default decoding implementation.
     * All methods that rely in a proper decoding to work, such as `Cookies.remove()` and `Cookies.get()`, will run the converter first for each cookie.
     * The returning String will be used as the cookie value.
     */
    withConverter<T extends object, TResult = CookiesStatic>(converter: Cookies.Converter<T, TResult>): TResult;
  }

  type Converter<T extends object, TResult> = (value: string, name: string) => any;
}

declare var Cookies: Cookies.CookiesStatic;

export = Cookies;
export as namespace Cookies; 