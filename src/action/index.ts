#!/usr/bin/env node
import process from "node:process";
import { runAction } from "./runtime.js";

process.exitCode = runAction();
