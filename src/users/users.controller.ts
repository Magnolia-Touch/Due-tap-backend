import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResponseService } from 'src/response/response.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { UserRole } from 'src/common/enums/user-roles.enum';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly responseService: ResponseService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return this.responseService.successResponse(
      'User Created Sucessfully',
      user,
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async findAll(@Query('role') role?: string) {
    if (role) {
      return this.usersService.findByRole(role);
    }
    const users = await this.usersService.findAll();
    return this.responseService.successResponse('Users Found', users);
  }

  @Get('roles')
  @Public()
  async getRoles(@Request() req) {
    const roles = await this.usersService.findallroles();
    return this.responseService.successResponse('Roles Found', roles);
  }

  @Get('clients')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async findAllClients() {
    const clients = await this.usersService.findByRole('CLIENT');
    return this.responseService.successResponse('Clients Found', clients);
  }

  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findOne(req.user.id);
    return this.responseService.successResponse('User Profile', user);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('profile')
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
