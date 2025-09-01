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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-roles.enum';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@ApiTags('Super Admin')
@ApiBearerAuth()
@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get Super Admin Dashboard Data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard() {
    return this.superAdminService.getDashboardData();
  }

  @Get('clients')
  @ApiOperation({ summary: 'Get all clients with pagination and search' })
  @ApiResponse({ status: 200, description: 'Clients retrieved successfully' })
  async getClients(@Query() pagination: PaginationDto) {
    return this.superAdminService.getClients(pagination);
  }

  @Get('clients/:id')
  @ApiOperation({ summary: 'Get client details' })
  @ApiResponse({ status: 200, description: 'Client details retrieved successfully' })
  async getClient(@Param('id') id: string) {
    return this.superAdminService.getClientDetails(id);
  }

  @Post('clients')
  @ApiOperation({ summary: 'Create a new client' })
  @ApiResponse({ status: 201, description: 'Client created successfully' })
  async createClient(@Body() createClientDto: CreateClientDto) {
    return this.superAdminService.createClient(createClientDto);
  }

  @Put('clients/:id')
  @ApiOperation({ summary: 'Update client details' })
  @ApiResponse({ status: 200, description: 'Client updated successfully' })
  async updateClient(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
  ) {
    return this.superAdminService.updateClient(id, updateClientDto);
  }

  @Put('clients/:id/status')
  @ApiOperation({ summary: 'Toggle client status' })
  @ApiResponse({ status: 200, description: 'Client status updated successfully' })
  async toggleClientStatus(@Param('id') id: string) {
    return this.superAdminService.toggleClientStatus(id);
  }

  @Get('clients/:id/analytics')
  @ApiOperation({ summary: 'Get client analytics' })
  @ApiResponse({ status: 200, description: 'Client analytics retrieved successfully' })
  async getClientAnalytics(@Param('id') id: string) {
    return this.superAdminService.getClientAnalytics(id);
  }

  @Delete('clients/:id')
  @ApiOperation({ summary: 'Delete a client' })
  @ApiResponse({ status: 200, description: 'Client deleted successfully' })
  async deleteClient(@Param('id') id: string) {
    return this.superAdminService.deleteClient(id);
  }
}
