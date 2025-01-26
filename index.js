import { assert } from 'console';
import {db} from './db'
import { todosTable } from './db/schema'
import { ilike,eq } from 'drizzle-orm';

async function getAllTodos() {
  const todos=await db.select().from(todosTable)
  return todos;
}

async function createTodo(todo) {
    await db.insert(todosTable).values({
        todo,
    });
}

async function searchTodo(search) {
    const todos=await db.select().from(todosTable).where(todosTable.todo.ilike(`%${search}%`))
    return todos;
}

async function deleteTodoById(id) {
    await db.delete(todosTable).where(todosTable.id.eq(id));
}

const SYSTEM_PROMPT=`
You are an AI To-Do List Assistant.You can manage tasks by adding ,viewing,updating and deleting tasks.
You must strictly follow the JSON format for the output

Todo DB Schema:
id: Int and Primary Key
todo: String
created_at: Date Time
updated_at: Date Time

Available Tools:
- getAllTodos(): Returns all the todos from Database
- createTodo(todo:String): Creates a new todo in the Database and takes todo as a string
- deleteTodoById(id:String): Deletes a todo from the Database by id 
- searchTodo(query:String): Searches a todo from the Database by query string

Example:
START
{"type":"user", "user":"Add a task for shopping groceries."}
{"type":"plan","plan":"I will try to get more context on what user needs to shop."}
{"type":"output", "output":"Can you tell me what all items you want to shop?"}
{"type":"user","user":"I want to shop for milk and bread"}
{"type:"plan","plan":"I will use createTodo method to add the task to the database"}
{"type":"action","function":"createTodo","input":"Shopping groceries"}
`

