interface TokenPayload {
    userId: string; // ID JS code on script data-id
    fp: {
        userAgent: string;
        forwardedFor?: string;
        realIp?: string;
        srvUserAgent?: string;
        srvHost?: string;
        srvReferer?: string;
        timezone?: string;
        platform?: string;
        host?: string; // Must be the same of srvReferer is the domain of the user
    };
}

// UserDomainValidation: validates host and userId, allows open the App
// Token: allows to access to further services
