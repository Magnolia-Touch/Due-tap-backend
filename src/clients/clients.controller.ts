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
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-roles.enum';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ClientDashboardStatsDto } from './dto/dashboard.dto';

@ApiTags('Client Dashboard')
@ApiBearerAuth()
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CLIENT)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get Client Dashboard Data' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dashboard data retrieved successfully',
    type: ClientDashboardStatsDto,
  })
  async getDashboard(@Request() req) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.clientsService.getDashboardData(clientId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get client profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.clientsService.getClientProfile(clientId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update client profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Request() req, @Body() updateData: any) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.clientsService.updateClientProfile(clientId, updateData);
  }
}
