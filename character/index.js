import characters from "./character.js";
import skills from "./skill.js";
import { characterTranslate, createSkillTranslate } from "./translate.js";
import voices from "./voices.js";

export function createCharacterPackage() {
  return { character: characters, translate: characterTranslate };
}

export function createSkillPackage() {
  return { skill: skills, translate: { ...createSkillTranslate(), ...voices } };
}
