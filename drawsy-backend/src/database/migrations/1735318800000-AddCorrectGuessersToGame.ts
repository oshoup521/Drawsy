import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCorrectGuessersToGame1735318800000 implements MigrationInterface {
  name = 'AddCorrectGuessersToGame1735318800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'games',
      new TableColumn({
        name: 'correctGuessers',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('games', 'correctGuessers');
  }
}