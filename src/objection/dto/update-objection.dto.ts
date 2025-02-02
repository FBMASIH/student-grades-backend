import { PartialType } from '@nestjs/mapped-types';
import { CreateObjectionDto } from './create-objection.dto';

export class UpdateObjectionDto extends PartialType(CreateObjectionDto) {}
