import bcrypt from 'bcryptjs';
import { generateTokens } from '../../../infrastructure/external/jwt.js';
import { User } from '../../../domain/entities/User.js';
import { IUserRepository } from '../../../infrastructure/repositories/IUserRepository.js';


export class LoginUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute(email, password) {
        // Input validation (business rule)
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        // Fetch user via abstract repo
        const userData = await this.userRepository.findByEmail(email);
        if (!userData) {
            throw new Error('Invalid credentials');
        }

        //  Map to domain entity & validate
        const user = new User(userData);
        if (!user.isActive() || user.authProvider !== 'LOCAL') {
            throw new Error('Invalid credentials or unsupported auth provider');
        }

        //  Verify password (business invariant)
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new Error('Invalid credentials');
        }

        // Generate tokens (success)
        const { accessToken, refreshToken } = generateTokens(user.id, user.userRole);

        // Return business result (no HTTP details)
        return {
            accessToken,
            refreshToken,
            user: user.toJSON()
        };
    }
}