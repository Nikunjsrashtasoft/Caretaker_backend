import { EntitySchema } from "typeorm";

export const User = new EntitySchema({
    name: "User",
    tableName: "users",
    columns: {
        id: {
            primary: true,
            type: "int",
            generated: true,
        },
        name: {
            type: "varchar",
        },
        email: {
            type: "varchar",
        },
        // Include additional user columns as needed.
    },
    relations: {
        shifts: {
            target: "Shift",
            type: "one-to-many",
            inverseSide: "caretaker",
        },
    },
});
