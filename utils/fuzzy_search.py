from fuzzywuzzy import process

def fuzzy_find_module(query, choices):
    match, score = process.extractOne(query, choices)
    return match if score > 60 else None
