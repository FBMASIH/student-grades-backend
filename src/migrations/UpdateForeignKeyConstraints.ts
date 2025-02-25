import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateForeignKeyConstraints implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing foreign keys
    await queryRunner.query(
      'ALTER TABLE enrollments DROP FOREIGN KEY FK_enrollments_student',
    );
    await queryRunner.query(
      'ALTER TABLE enrollments DROP FOREIGN KEY FK_enrollments_group',
    );
    await queryRunner.query(
      'ALTER TABLE enrollments DROP FOREIGN KEY FK_enrollment_createdBy',
    );

    // Recreate with CASCADE
    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD CONSTRAINT FK_enrollments_student
      FOREIGN KEY (studentId) REFERENCES users(id)
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD CONSTRAINT FK_enrollments_group
      FOREIGN KEY (groupId) REFERENCES course_groups(id)
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD CONSTRAINT FK_enrollment_createdBy
      FOREIGN KEY (createdById) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to original constraints without CASCADE
    await queryRunner.query(
      'ALTER TABLE enrollments DROP FOREIGN KEY FK_enrollments_student',
    );
    await queryRunner.query(
      'ALTER TABLE enrollments DROP FOREIGN KEY FK_enrollments_group',
    );
    await queryRunner.query(
      'ALTER TABLE enrollments DROP FOREIGN KEY FK_enrollment_createdBy',
    );

    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD CONSTRAINT FK_enrollments_student
      FOREIGN KEY (studentId) REFERENCES users(id)
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD CONSTRAINT FK_enrollments_group
      FOREIGN KEY (groupId) REFERENCES course_groups(id)
    `);

    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD CONSTRAINT FK_enrollment_createdBy
      FOREIGN KEY (createdById) REFERENCES users(id)
    `);
  }
}
