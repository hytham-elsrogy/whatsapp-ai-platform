import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds routing configuration to departments — needed by RoutingService
 * (round_robin cursor + selectable strategy). Not part of the Phase 1
 * design doc's initial table list; added here as Phase 4 introduces the
 * routing engine that actually needs it.
 */
export class AddDepartmentRouting1786896303533 implements MigrationInterface {
  name = 'AddDepartmentRouting1786896303533';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE departments
        ADD COLUMN routing_strategy VARCHAR(20) NOT NULL DEFAULT 'round_robin',
        ADD COLUMN last_assigned_index INT NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE departments
        DROP COLUMN routing_strategy,
        DROP COLUMN last_assigned_index;
    `);
  }
}
