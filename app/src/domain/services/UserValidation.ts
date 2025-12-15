import UserRepository from "@domain/repository/UserRepository";
import { Request } from 'express';
import UserData from "@services/base/UserData";

// todo
export default class UserValidation {
    // validates that the user is valid in our database

    constructor(
        private userRepository: UserRepository,
        private userData: UserData
    ) {
    }

    public validate(req: Request) {
        const userData = this.userData.set(req).get();
        console.log('code', userData);

        let user = this.userRepository.findByCode(userData?.userId as string);


    }
}