export enum AppMode {
    DEVELOPMENT = 'development',
    PRODUCTION = 'production',
}

export const isDevelopmentMode = process.env.NODE_ENV === AppMode.DEVELOPMENT;
export const isProductionMode = process.env.NODE_ENV === AppMode.PRODUCTION;
