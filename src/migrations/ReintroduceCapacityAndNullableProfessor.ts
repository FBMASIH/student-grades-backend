import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ReintroduceCapacityAndNullableProfessor
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCapacity = await queryRunner.hasColumn(
      'course_groups',
      'capacity',
    );

    if (!hasCapacity) {
      await queryRunner.addColumn(
        'course_groups',
        new TableColumn({
          name: 'capacity',
          type: 'int',
          isNullable: true,
        }),
      );
    } else {
      await queryRunner.changeColumn(
        'course_groups',
        'capacity',
        new TableColumn({
          name: 'capacity',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    await queryRunner.changeColumn(
      'course_groups',
      'professorId',
      new TableColumn({
        name: 'professorId',
        type: 'int',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasCapacity = await queryRunner.hasColumn(
      'course_groups',
      'capacity',
    );

    if (hasCapacity) {
      await queryRunner.dropColumn('course_groups', 'capacity');
    }

    await queryRunner.changeColumn(
      'course_groups',
      'professorId',
      new TableColumn({
        name: 'professorId',
        type: 'int',
        isNullable: false,
      }),
    );
  }
}
