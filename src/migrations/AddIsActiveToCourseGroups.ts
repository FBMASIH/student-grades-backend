import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIsActiveToCourseGroups implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'course_groups',
      new TableColumn({
        name: 'isActive',
        type: 'boolean',
        default: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('course_groups', 'isActive');
  }
}
