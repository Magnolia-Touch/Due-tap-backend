import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTaskDto } from './ dto/create-task.dto';
import { UpdateTaskDto } from './ dto/update-task.dto';
@Injectable()
export class TasksService {
    constructor(private prisma: PrismaService) { }

    // 🟢 Create a new task
    async create(createTaskDto: CreateTaskDto) {
        return this.prisma.task.create({
            data: createTaskDto,
        });
    }

    // 🟡 Get all tasks with optional filters
    async findAll(params?: {
        clientId?: string;
        endUserId?: string;
        isSent?: boolean;
    }) {
        const { clientId, endUserId, isSent } = params || {};

        return this.prisma.task.findMany({
            where: {
                clientId,
                endUserId,
                isSent,
            },
            orderBy: {
                notificationDate: 'asc',
            },
        });
    }

    // 🔵 Get single task
    async findOne(id: string) {
        const task = await this.prisma.task.findUnique({ where: { id } });
        if (!task) throw new NotFoundException('Task not found');
        return task;
    }

    // 🟣 Update task
    async update(id: string, updateTaskDto: UpdateTaskDto) {
        const exists = await this.prisma.task.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Task not found');

        return this.prisma.task.update({
            where: { id },
            data: updateTaskDto,
        });
    }

    // 🔴 Delete task
    async remove(id: string) {
        const exists = await this.prisma.task.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException('Task not found');

        return this.prisma.task.delete({ where: { id } });
    }

    // 🕒 Mark task as sent
    async markAsSent(id: string) {
        return this.prisma.task.update({
            where: { id },
            data: { isSent: true, paidDate: new Date() },
        });
    }
}
