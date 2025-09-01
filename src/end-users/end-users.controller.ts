import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EndUsersService } from './end-users.service';
import { ClientsService } from '../clients/clients.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-roles.enum';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  CreateEndUserDto,
  UpdateEndUserDto,
  EndUserResponseDto,
} from './dto/end-user.dto';

@ApiTags('End Users')
@ApiBearerAuth()
@Controller('end-users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CLIENT)
export class EndUsersController {
  constructor(
    private readonly endUsersService: EndUsersService,
    private readonly clientsService: ClientsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all end users for client' })
  @ApiResponse({ 
    status: 200, 
    description: 'End users retrieved successfully',
    type: [EndUserResponseDto],
  })
  async getEndUsers(@Request() req, @Query() pagination: PaginationDto) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.endUsersService.getEndUsers(clientId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get end user by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'End user retrieved successfully',
    type: EndUserResponseDto,
  })
  async getEndUser(@Request() req, @Param('id') id: string) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.endUsersService.getEndUser(id, clientId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new end user' })
  @ApiResponse({ 
    status: 201, 
    description: 'End user created successfully',
    type: EndUserResponseDto,
  })
  async createEndUser(
    @Request() req,
    @Body() createEndUserDto: CreateEndUserDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.endUsersService.createEndUser(clientId, createEndUserDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an end user' })
  @ApiResponse({ 
    status: 200, 
    description: 'End user updated successfully',
    type: EndUserResponseDto,
  })
  async updateEndUser(
    @Request() req,
    @Param('id') id: string,
    @Body() updateEndUserDto: UpdateEndUserDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.endUsersService.updateEndUser(id, clientId, updateEndUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an end user' })
  @ApiResponse({ status: 200, description: 'End user deleted successfully' })
  async deleteEndUser(@Request() req, @Param('id') id: string) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.endUsersService.deleteEndUser(id, clientId);
  }

  @Get(':id/subscriptions')
  @ApiOperation({ summary: 'Get all subscriptions for an end user' })
  @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
  async getEndUserSubscriptions(@Request() req, @Param('id') id: string) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.endUsersService.getEndUserSubscriptions(id, clientId);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Get payment history for an end user' })
  @ApiResponse({ status: 200, description: 'Payment history retrieved successfully' })
  async getEndUserPayments(
    @Request() req,
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.endUsersService.getEndUserPayments(id, clientId, pagination);
  }
}
