import { EntitySchema } from "typeorm";

export const Shift = new EntitySchema({
    name: "Shift",
    tableName: "shifts",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true,
        },
        caretakerId: {
            type: "int",
        },
        day: {
            type: "varchar",
        },
        startTime: {
            type: "time",
        },
        endTime: {
            type: "time",
        },
    },
    relations: {
        caretaker: {
            target: "User",
            type: "many-to-one",
            joinColumn: { name: "caretakerId" },
            inverseSide: "shifts",
        },
    },
});
