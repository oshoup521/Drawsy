import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Round } from './round.entity';

@Entity('drawing_data')
export class DrawingData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('float')
  x: number;

  @Column('float')
  y: number;

  @Column()
  color: string;

  @Column('float')
  lineWidth: number;

  @Column({ nullable: true })
  strokeId: string;

  @Column()
  roundId: string;

  @ManyToOne(() => Round, (round) => round.drawingData, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roundId' })
  round: Round;

  @CreateDateColumn()
  createdAt: Date;
}
