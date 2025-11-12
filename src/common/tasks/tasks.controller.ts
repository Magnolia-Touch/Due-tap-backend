import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './ dto/create-task.dto';
import { UpdateTaskDto } from './ dto/update-task.dto';

@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    // 🟢 Create a new task
    @Post()
    create(@Body() createTaskDto: CreateTaskDto) {
        return this.tasksService.create(createTaskDto);
    }

    // 🟡 Get all tasks (supports filtering)
    @Get()
    findAll(
        @Query('clientId') clientId?: string,
        @Query('endUserId') endUserId?: string,
        @Query('isSent') isSent?: string,
    ) {
        return this.tasksService.findAll({
            clientId,
            endUserId,
            isSent: isSent ? isSent === 'true' : undefined,
        });
    }

    // 🔵 Get one task by ID
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.tasksService.findOne(id);
    }

    // 🟣 Update task
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
        return this.tasksService.update(id, updateTaskDto);
    }

    // 🕒 Mark as sent
    @Patch(':id/mark-sent')
    markAsSent(@Param('id') id: string) {
        return this.tasksService.markAsSent(id);
    }

    // 🔴 Delete task
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.tasksService.remove(id);
    }
}
