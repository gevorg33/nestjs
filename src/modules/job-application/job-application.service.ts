import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { getConnection, Repository } from 'typeorm';
import { JobApplicationEntity } from './job-application.entity';
import { UserEntity } from '../user/user.entity';
import { CreateJobAppDto } from './dto/create-job-application.dto';
import { UpdateJobAppDto } from './dto/update-job-application.dto';
import { AttachmentService } from '../attachment/attachment.service';
import { AttachmentItemTypes } from '../../common/constants/attachment-item-types';
import { UserRoles } from '../../common/constants/user-roles';

@Injectable()
export class JobApplicationService {
  constructor(
    @InjectRepository(JobApplicationEntity)
    private readonly jobAppRepository: Repository<JobApplicationEntity>,
    private readonly attachmentService: AttachmentService,
  ) {}

  async getById(id: number): Promise<JobApplicationEntity> {
    const jobApp = await this.jobAppRepository.findOne(id);
    if (!jobApp) throw new NotFoundException('JobApp not found');
    return jobApp;
  }

  async create(
    user: UserEntity,
    data: CreateJobAppDto,
    files: Array<Express.Multer.File>,
  ): Promise<JobApplicationEntity> {
    const queryRunner = getConnection().createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      let jobApp = await this.jobAppRepository.create({
        ...data,
        userId: user.id,
      });
      jobApp = await queryRunner.manager.save(jobApp);

      await this.attachmentService.createJobApplyAttachments(
        jobApp.id,
        files,
        queryRunner,
      );

      await queryRunner.commitTransaction();

      return this.getById(jobApp.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(err);
    }
  }

  async update(
    user: UserEntity,
    id: number,
    data: UpdateJobAppDto,
    files: Array<Express.Multer.File>,
  ): Promise<JobApplicationEntity> {
    const jobApp = await this.getById(id);
    if (jobApp.userId !== user.id) {
      throw new ForbiddenException('You have no access');
    }

    const attachIdsForDelete = JSON.parse(data.attachmentIdsForDelete);
    const queryRunner = getConnection().createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      jobApp.expectedPrice = data.expectedPrice;
      jobApp.paymentDetails = data.paymentDetails;
      jobApp.cover = data.cover;

      await this.attachmentService.createJobApplyAttachments(
        id,
        files,
        queryRunner,
      );

      await this.attachmentService.deleteItemAttachmentsByIds(
        AttachmentItemTypes.JOB_APPLICATION,
        id,
        attachIdsForDelete,
        queryRunner,
      );

      const updated = await queryRunner.manager.save(jobApp);
      await queryRunner.commitTransaction();

      return this.getById(updated.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(err);
    }
  }

  async confirm(user: UserEntity, id: number): Promise<JobApplicationEntity> {
    const jobApp = await this.jobAppRepository.findOne(id, {
      relations: ['job'],
    });

    if (!jobApp) throw new NotFoundException('JobApp not found');

    if (jobApp.job.publisherId !== user.id) {
      throw new ForbiddenException('You have no access');
    }

    jobApp.confirm = true;

    await this.jobAppRepository.save(jobApp);

    return this.getById(id);
  }

  async delete(user: UserEntity, id: number): Promise<JobApplicationEntity> {
    const jobApp = await this.getById(id);

    if (jobApp.userId !== user.id) {
      throw new ForbiddenException('You have no access');
    }

    await this.jobAppRepository.delete(id);

    return jobApp;
  }

  async getJobAppData(
    user: UserEntity,
    id: number,
  ): Promise<JobApplicationEntity> {
    const jobApp = await this.jobAppRepository.findOne(id, {
      relations: ['job', 'user'],
    });

    if (!jobApp) throw new NotFoundException('JobApp not found');

    return jobApp;
  }

  async getList(user: UserEntity): Promise<JobApplicationEntity[]> {
    const queryBuilder = await this.jobAppRepository
      .createQueryBuilder('jobApp')
      .leftJoinAndSelect('jobApp.job', 'job');

    if (user.role.name === UserRoles.CUSTOMER) {
      await queryBuilder.where('job.publisherId = :uId', { uId: user.id });
    } else {
      await queryBuilder.where('jobApp.userId = :uId', { uId: user.id });
    }

    return queryBuilder.getMany();
  }
}
