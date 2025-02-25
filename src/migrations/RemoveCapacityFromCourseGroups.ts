import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveCapacityFromCourseGroups implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('course_groups', 'capacity');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'course_groups',
      new TableColumn({
        name: 'capacity',
        type: 'int',
        isNullable: false,
        default: 0,
      }),
    );
  }
}
