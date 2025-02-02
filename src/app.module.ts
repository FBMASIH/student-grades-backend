import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { GradeModule } from './grade/grade.module';
import { ObjectionModule } from './objection/objection.module';
import { UserModule } from './user/user.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './auth/role/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT ?? '3306'),
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'student_grades',
      autoLoadEntities: true,
      synchronize: true,
    }),

    UserModule,
    GradeModule,
    ObjectionModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
