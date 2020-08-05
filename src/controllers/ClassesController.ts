import { Request, Response } from 'express';
import hm2min from "../utils/commons";
import db from '../database/connection';

interface ScheduleItem {
    week_day: number;
    from: string;
    to: string;
}

export default class ClassesController {
    async index(request: Request, response: Response) {
        const filters = request.query;
        const { subject, week_day, time } = filters;
        if (!filters.week_day || !filters.subject || !filters.time ) {
            return response.status(400).json({
                error: 'Missing filters to search classes'
            });
        }

        const minutes = hm2min(time as string);
        const classes = await db('classes')
            .whereExists(function() {
                this.select('class_schedule.*')
                    .from('class_schedule')
                    .whereRaw('`class_schedule`.`class_id` = `classes`.`id`')
                    .whereRaw('`class_schedule`.`week_day` = ??', [Number(week_day)])
                    .whereRaw('`class_schedule`.`from` <= ??', [minutes])
                    .whereRaw('`class_schedule`.`to` > ??', [minutes])
            })
            .where('classes.subject', '=', subject as string)
            .join('users', 'classes.user_id', '=', 'users.id')
            .select(['classes.*', 'users.*']);
        return response.json(classes);
    }


    async create(request: Request, response: Response) {
        const {
            name, avatar, whatsapp, bio, subject, cost, schedule
        } = request.body;
        const trx = await db.transaction();
        try {
            const user_id = (await trx('users').insert({ name, avatar, whatsapp, bio }))[0];
            const class_id = (await trx('classes').insert({ subject, cost, user_id}))[0];
            const class_schedule = schedule.map((scheduleItem: ScheduleItem) => {
                return {
                    class_id,
                    week_day: scheduleItem.week_day,
                    from: hm2min(scheduleItem.from),
                    to: hm2min(scheduleItem.to)
                }
            });
            await trx('class_schedule').insert(class_schedule);
            await trx.commit();
            response.status(201).send();
        } catch (err) {
            await trx.rollback();
            return response.status(400).json({
                error: 'Unexpected error while creating new class'
            });
        }
    }
}