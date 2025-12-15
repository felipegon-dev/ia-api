interface TokenPayload {
    userId: string;
    fp: {
        userAgent: string;
        forwardedFor?: string;
        realIp?: string;
        srvUserAgent?: string;
        srvHost?: string;
        srvReferer?: string;
        timezone?: string;
        platform?: string;
        host?: string;
    };
}
