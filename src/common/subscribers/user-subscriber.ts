import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  ObjectLiteral,
  SelectQueryBuilder,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {
    this.dataSource.subscribers.push(this);
  }

  listenTo() {
    return User;
  }

  afterLoadOne(entity: User) {
    // Optional: You can add logic here if needed after a single entity is loaded
  }

  beforeFind(event: ObjectLiteral) {
    if (event.queryBuilder) {
      const alias = event.queryBuilder.alias;
      if (
        !event.queryBuilder.expressionMap.wheres?.some((w) =>
          w.expression.includes('isActive'),
        )
      ) {
        (event.queryBuilder as SelectQueryBuilder<User>).andWhere(
          `${alias}.isActive = :isActive`,
          { isActive: true },
        );
      }
    }
  }
}
