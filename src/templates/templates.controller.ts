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
import { TemplatesService } from './templates.service';
import { ClientsService } from '../clients/clients.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-roles.enum';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateResponseDto,
} from './dto/template.dto';

@ApiTags('Templates')
@ApiBearerAuth()
@Controller('templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CLIENT)
export class TemplatesController {
  constructor(
    private readonly templatesService: TemplatesService,
    private readonly clientsService: ClientsService,
  ) { }

  @Get()
  @ApiOperation({ summary: 'Get all templates for client' })
  @ApiResponse({
    status: 200,
    description: 'Templates retrieved successfully',
    type: [TemplateResponseDto],
  })
  async getTemplates(@Request() req, @Query() pagination: PaginationDto) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.templatesService.getTemplates(clientId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({
    status: 200,
    description: 'Template retrieved successfully',
    type: TemplateResponseDto,
  })
  async getTemplate(@Request() req, @Param('id') id: string) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.templatesService.getTemplate(id, clientId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new template' })
  @ApiResponse({
    status: 201,
    description: 'Template created successfully',
    type: TemplateResponseDto,
  })
  async createTemplate(
    @Request() req,
    @Body() createTemplateDto: CreateTemplateDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.templatesService.createTemplate(clientId, createTemplateDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a template' })
  @ApiResponse({
    status: 200,
    description: 'Template updated successfully',
    type: TemplateResponseDto,
  })
  async updateTemplate(
    @Request() req,
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.templatesService.updateTemplate(id, clientId, updateTemplateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  async deleteTemplate(@Request() req, @Param('id') id: string) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.templatesService.deleteTemplate(id, clientId);
  }

  @Put(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle template active status' })
  @ApiResponse({ status: 200, description: 'Template status updated successfully' })
  async toggleStatus(@Request() req, @Param('id') id: string) {
    const clientId = await this.clientsService.getClientIdFromUser(req.user.id);
    return this.templatesService.toggleTemplateStatus(id, clientId);
  }
}
