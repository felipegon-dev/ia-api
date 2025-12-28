// src/value-objects/UserStatus.ts
export class UserStatus {
    private constructor(private readonly value: 'active' | 'inactive' | 'banned') {}

    static ACTIVE = new UserStatus('active');
    static INACTIVE = new UserStatus('inactive');
    static BANNED = new UserStatus('banned');

    get Value() {
        return this.value;
    }

    equals(other: UserStatus) {
        return this.value === other.value;
    }
}
