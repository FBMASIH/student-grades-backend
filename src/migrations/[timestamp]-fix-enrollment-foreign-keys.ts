import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixEnrollmentForeignKeys implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop existing foreign key if it exists
    await queryRunner.query(`
      ALTER TABLE \`enrollments\` 
      DROP FOREIGN KEY IF EXISTS \`FK_41de538b3eed286f53dd678b030\`
    `);

    // Add the correct foreign key
    await queryRunner.query(`
      ALTER TABLE \`enrollments\` 
      ADD CONSTRAINT \`FK_enrollment_createdBy\` 
      FOREIGN KEY (\`createdById\`) 
      REFERENCES \`users\`(\`id\`) 
      ON DELETE NO ACTION 
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`enrollments\` 
      DROP FOREIGN KEY IF EXISTS \`FK_enrollment_createdBy\`
    `);
  }
}
