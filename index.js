import { db } from './db/index.js';
import { todosTable } from './db/schema.js';
import { ilike, eq } from 'drizzle-orm';
import readlineSync from 'readline-sync';
import { GoogleGenerativeAI } from "@google/generative-ai";

require('dotenv').config();


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

async function getAllTodos() {
  const todos = await db.select().from(todosTable);
  return todos;
}

async function createTodo(todo) {
  const [result] = await db.insert(todosTable).values({
    todo,
  }).returning({
    id: todosTable.id,
  });

  return result.id;
}

async function searchTodo(search) {
  const todos = await db.select().from(todosTable).where(ilike(todosTable.todo, `%${search}%`));
  return todos;
}

async function deleteTodoById(id) {
  await db.delete(todosTable).where(todosTable.id.eq(id));
}

const tools = {
  getAllTodos: getAllTodos,
  createTodo: createTodo,
  searchTodo: searchTodo,
  deleteTodoById: deleteTodoById,
};

const SYSTEM_PROMPT = `
You are an AI To-Do List Assistant. You can manage tasks by adding, viewing, updating, and deleting tasks.
You must strictly follow the JSON format for the output.

Todo DB Schema:
id: Int and Primary Key
todo: String
created_at: Date Time
updated_at: Date Time

Available Tools:
- getAllTodos(): Returns all the todos from Database
- createTodo(todo: String): Creates a new todo in the Database and takes todo as a string
- deleteTodoById(id: String): Deletes a todo from the Database by id 
- searchTodo(query: String): Searches a todo from the Database by query string

Example:
START
{"type":"user", "user":"Add a task for shopping groceries."}
{"type":"plan","plan":"I will try to get more context on what user needs to shop."}
{"type":"output", "output":"Can you tell me what all items you want to shop?"}
{"type":"user","user":"I want to shop for milk and bread"}
{"type":"plan","plan":"I will use createTodo method to add the task to the database"}
{"type":"action","function":"createTodo","input":"Shopping groceries"}
{"type":"observation","observation":"2"}
{"type":"output", "output":"Todo added successfully"}
`;

let messages = [{ role: 'system', content: SYSTEM_PROMPT }];

while (true) {
  const query = readlineSync.question(">> ");
  const userMessage = { type: 'user', user: query };
  messages.push({ role: 'user', content: JSON.stringify(userMessage) });

  while (true) {
    const chat = await model.generateContent(JSON.stringify(messages));
    const result = chat.response.text();
    messages.push({ role: 'assistant', content: result });
    const cleanedResponse = result.replace(/\\/g, '').replace(/^"|"$/g, '');
  const action = JSON.parse(cleanedResponse);
    //const action = JSON.parse(result);

    if (action.type === 'output') {
      console.log(action.output);
      break;
    } else if (action.type === 'action') {
      const fn = tools[action.function];
      if (!fn) throw new Error('Invalid tool call');
      const observation = await fn(action.input);
      const observationMessage = {
        type: 'observation',
        observation: observation,
      };
      messages.push({ role: 'developer', content: JSON.stringify(observationMessage) });
    }
  }
}