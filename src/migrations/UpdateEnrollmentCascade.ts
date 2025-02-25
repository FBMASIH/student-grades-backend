import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEnrollmentCascade implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing foreign key
    await queryRunner.query(
      'ALTER TABLE enrollments DROP FOREIGN KEY FK_3d0d1a0f6dbf62e15cd204a1465',
    );

    // Add new foreign key with CASCADE
    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD CONSTRAINT FK_3d0d1a0f6dbf62e15cd204a1465
      FOREIGN KEY (groupId) 
      REFERENCES course_groups(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop cascade foreign key
    await queryRunner.query(
      'ALTER TABLE enrollments DROP FOREIGN KEY FK_3d0d1a0f6dbf62e15cd204a1465',
    );

    // Restore original foreign key without CASCADE
    await queryRunner.query(`
      ALTER TABLE enrollments
      ADD CONSTRAINT FK_3d0d1a0f6dbf62e15cd204a1465
      FOREIGN KEY (groupId) 
      REFERENCES course_groups(id)
    `);
  }
}
