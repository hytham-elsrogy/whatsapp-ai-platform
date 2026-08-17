import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * A ticket (and its opening comment) can be created by the AI Agent, not
 * just a human user — same rationale as messages.sender_id already being
 * nullable for sender_type='ai'/'bot'/'system'.
 */
export class AllowSystemAuthoredTicketComments1786911430708 implements MigrationInterface {
  name = "AllowSystemAuthoredTicketComments1786911430708";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ticket_comments ALTER COLUMN user_id DROP NOT NULL;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ticket_comments ALTER COLUMN user_id SET NOT NULL;`,
    );
  }
}
