// types/UserWithDomains.ts
import { Model } from "sequelize";
import { UserDomainAttributes } from "./UserDomainAttributes";

export type UserWithDomains = Model & {
    domains?: UserDomainAttributes[];
};
