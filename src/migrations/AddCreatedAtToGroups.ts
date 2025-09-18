import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCreatedAtToGroups implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('groups', 'createdAt');

    if (!hasColumn) {
      await queryRunner.addColumn(
        'groups',
        new TableColumn({
          name: 'createdAt',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('groups', 'createdAt');

    if (hasColumn) {
      await queryRunner.dropColumn('groups', 'createdAt');
    }
  }
}
