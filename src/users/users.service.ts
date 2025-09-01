import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password, role } = createUserDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) throw new ConflictException('Email already in use');

    // Validate role enum
    if (role && !Object.values(UserRole).includes(role as UserRole)) {
      throw new ConflictException(
        `Invalid role. Available roles: ${Object.values(UserRole).join(', ')}`,
      );
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        role: (role as UserRole) || UserRole.CLIENT,
      },
    });

    const { password: _, ...result } = user;
    return result;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByRole(roleName: string) {
    return this.prisma.user.findMany({
      where: { role: roleName as UserRole },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findallroles() {
    return Object.values(UserRole).map((role) => ({
      id: role,
      name: role,
    }));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // ensure user exists

    const updateData: any = { ...updateUserDto };

    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.role) {
      if (!Object.values(UserRole).includes(updateUserDto.role as UserRole)) {
        throw new ConflictException(
          `Invalid role. Available roles: ${Object.values(UserRole).join(', ')}`,
        );
      }
      updateData.role = updateUserDto.role as UserRole;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    const { password: _, ...result } = updatedUser;
    return result;
  }

  async remove(id: string) {
    await this.findOne(id); // ensure user exists

    await this.prisma.user.delete({ where: { id } });

    return { message: `User with ID ${id} deleted successfully` };
  }
}
