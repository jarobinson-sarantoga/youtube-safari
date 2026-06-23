let playGeneration = 0;

export function bumpPlayGeneration(): number {
  playGeneration += 1;
  return playGeneration;
}

export function getPlayGeneration(): number {
  return playGeneration;
}
