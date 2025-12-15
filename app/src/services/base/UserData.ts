import {Request, Response} from "express";
import {HEADERS} from "@config/headers";

export default class UserData {

    /**
     * {
     *   userId: 'myuniqueuserid',
     *   userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
     *   platform: 'Linux x86_64',
     *   vendor: 'Google Inc.',
     *   language: 'es-ES',
     *   languages: 'es-ES,es',
     *   cookiesEnabled: true,
     *   screenWidth: 1680,
     *   screenHeight: 1050,
     *   viewportWidth: 1037,
     *   viewportHeight: 902,
     *   timezone: 'Atlantic/Canary',
     *   referer: '',
     *   host: 'test-site.com:8000',
     *   ip: '::ffff:172.23.0.1',
     *   forwardedFor: '172.23.0.1',
     *   realIp: '172.23.0.1',
     *   srvUserAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
     *   srvHost: 'ia-apps',
     *   srvReferer: 'http://test-site.com:8000/'
     * }
     */
    public get = (req: Request, res: Response): object => {
        const jsUserData = JSON.parse(req.headers[HEADERS.USER_DATA] as string || '{}');

        const data = {
            ...jsUserData,
            ip: req.ip,
            forwardedFor: req.headers[HEADERS.FORWARDED_FOR] as string,
            realIp: req.headers[HEADERS.REAL_IP] as string,
            srvUserAgent: req.headers[HEADERS.USER_AGENT] as string,
            srvHost: req.headers[HEADERS.HOST] as string, // nginx
            srvReferer: (() => { // widget site
                const referer = req.headers[HEADERS.REFERER] as string || '';
                try {
                    return new URL(referer).host;
                } catch {
                    return '';
                }
            })(),
        };

        console.log('get user data')
        console.log(data)

        return data;
    };
}