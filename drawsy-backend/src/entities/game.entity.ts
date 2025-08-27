import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Player } from './player.entity';
import { Round } from './round.entity';

export enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished',
}

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  roomId: string;

  @Column()
  playerCount: number;

  @Column()
  guessTime: number;

  @Column()
  numRounds: number;

  @Column({ default: 1 })
  currentRound: number;

  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.WAITING,
  })
  status: GameStatus;

  @Column({ nullable: true })
  hostUserId: string;

  @Column({ nullable: true })
  currentDrawerUserId: string;

  @Column({ nullable: true })
  currentWord: string;

  @Column({ nullable: true })
  wordLength: number;

  @Column('simple-array', { nullable: true })
  correctGuessers: string[];

  @OneToMany(() => Player, (player) => player.game, { cascade: true })
  players: Player[];

  @OneToMany(() => Round, (round) => round.game, { cascade: true })
  rounds: Round[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
