import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Game } from './game.entity';
import { DrawingData } from './drawing-data.entity';

@Entity('rounds')
export class Round {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roundNumber: number;

  @Column()
  drawerUserId: string;

  @Column()
  word: string;

  @Column({ nullable: true })
  topic: string;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ nullable: true })
  completedAt: Date;

  @Column()
  gameId: string;

  @ManyToOne(() => Game, (game) => game.rounds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @OneToMany(() => DrawingData, (drawingData) => drawingData.round, { cascade: true })
  drawingData: DrawingData[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
