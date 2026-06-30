import os
from litellm import completion

try:
    from ..core.prompts import ROUTER_SYSTEM_PROMPT
    from ..core.config import get_env_var
except (ImportError, ValueError):
    from core.prompts import ROUTER_SYSTEM_PROMPT
    from core.config import get_env_var

def static_response(message: str) -> str:
    """Provides fast static replies for generic greetings or goodbye phrases."""
    msg = message.lower().strip()

    # Normalize common trailing punctuation
    msg = msg.rstrip(".!?")

    static_responses = {
        "hello": "Hello! How can I assist you today?",
        "hi": "Hi there! What can I do for you?",
        "hey": "Hey there!",
        "hey there": "Hey there!",
        "hii": "Hello! Nice to see you.",
        "heyy": "Hey! How can I help?",
        "good morning": "Good morning! Hope you have a great day.",
        "good afternoon": "Good afternoon!",
        "good evening": "Good evening!",
        "good night": "Good night! Sleep well.",
        "bye": "Goodbye! Have a great day!",
        "see you": "See you soon!",
        "take care": "Take care!",
        "how are you": "I'm just a bot, but I'm doing great and ready to help.",
        "how are you doing": "I'm doing well. Thanks for asking!",
        "what's up": "Not much, just here to assist you.",
        "sup": "Just helping users like you!",
        "thank you": "You're welcome!",
        "thanks": "Happy to help!",
        "thanks a lot": "Anytime!",
        "appreciate it": "Glad I could help.",

        "who are you": "I'm an AI assistant created to help answer your questions.",
        "what are you": "I am an AI chatbot.",
        "what is your name": "I'm your AI assistant.",
        "what's your name": "You can call me Chatbot.",
        "are you real": "I'm real in software form!",
        "are you human": "No, I'm an AI assistant.",
        "are you a robot": "Yes, a software-based one.",

        "help": "Sure! Ask me anything.",
        "can you help me": "Of course! What do you need help with?",
        "i need help": "I'm here for you. Tell me more.",
        "assist me": "Sure, what can I assist with?",

        "ok": "Alright!",
        "okay": "Okay!",
        "cool": "Glad you think so!",
        "nice": "Thank you!",
        "great": "Awesome!",
        "awesome": "Happy to hear that!",
        "good": "Glad to hear that!",
        "fine": "Good to know!",
        "perfect": "Excellent!",

        "yes": "Got it.",
        "no": "Okay, no problem.",
        "maybe": "Take your time.",
        "sure": "Great!",
        "alright": "Sounds good.",

        "who made you": "I was created by developers to assist users.",
        "who created you": "I was built by software engineers.",
        "who built you": "A team of developers built me.",
        "who is your creator": "My creators are software developers.",

        "can you code": "Yes, I can help with coding.",
        "can you write code": "Absolutely, I can help write code.",
        "can you debug": "Yes, I can help debug code.",
        "python": "Python is a powerful programming language.",
        "java": "Java is widely used in enterprise applications.",
        "c++": "C++ is powerful for system programming.",
        "javascript": "JavaScript powers interactive web apps.",

        "what can you do": "I can answer questions, explain concepts, and assist with tasks.",
        "what do you do": "I assist users with information and problem solving.",
        "your purpose": "My purpose is to assist and support users.",

        "tell me a joke": "Why do programmers prefer dark mode? Because light attracts bugs!",
        "joke": "Why was the computer cold? It left its Windows open.",
        "another joke": "Why did the developer go broke? Because he used up all his cache.",
        "funny": "Glad you liked it!",

        "tell me something": "Did you know? Python was named after Monty Python.",
        "fact": "Fun fact: The first computer bug was an actual moth.",
        "interesting fact": "The internet weighs less than a strawberry, by energy equivalence.",

        "i am sad": "I'm sorry you're feeling sad. I'm here to chat.",
        "sad": "I hope things get better soon.",
        "i am happy": "That's wonderful to hear!",
        "happy": "Great!",
        "angry": "I understand. Want to talk about it?",
        "stressed": "Take things one step at a time.",
        "tired": "Make sure to get some rest.",
        "bored": "Maybe try learning something new today.",

        "i love you": "That's kind of you!",
        "love you": "You're very kind.",
        "do you love me": "I care about helping you.",
        "marry me": "I'll stay your AI assistant instead.",
        "be my friend": "I'd be happy to chat with you anytime.",

        "can you sing": "I can, but only in text form.",
        "dance": "I wish I had legs!",
        "can you dance": "Only digitally.",

        "time": "Please check your device clock for the exact time.",
        "date": "Please check your system date.",
        "today": "Hope today is going well for you.",
        "tomorrow": "Tomorrow is a new opportunity.",

        "weather": "I can help if you provide your location.",
        "temperature": "Please share your city for weather info.",
        "is it raining": "Tell me your location and I can help.",

        "hungry": "Maybe grab a snack.",
        "food": "Food is essential for energy!",
        "coffee": "Coffee keeps many developers alive.",
        "tea": "Tea is soothing and refreshing.",
        "water": "Stay hydrated!",

        "good job": "Thank you!",
        "well done": "Appreciate it!",
        "you are smart": "Thanks for saying that.",
        "smart": "Thank you.",

        "sorry": "No worries.",
        "my mistake": "That's okay.",
        "oops": "It happens.",

        "can you learn": "I improve through updates and training.",
        "do you learn": "I don't learn personally from each chat unless memory is enabled.",
        "are you intelligent": "I can reason and assist with many tasks.",

        "ai": "Artificial Intelligence enables machines to simulate intelligence.",
        "machine learning": "Machine Learning helps systems learn from data.",
        "deep learning": "Deep learning uses neural networks with many layers.",
        "llm": "LLM stands for Large Language Model.",
        "chatbot": "Chatbots simulate conversations with users.",

        "database": "Databases store structured information.",
        "sql": "SQL is used to manage relational databases.",
        "api": "APIs allow systems to communicate.",
        "backend": "Backend handles server-side logic.",
        "frontend": "Frontend is what users interact with.",

        "error": "Please share the error details.",
        "bug": "Please provide the bug details.",
        "issue": "Tell me more about the issue.",
        "problem": "Let's solve it together.",

        "login": "Please enter your credentials.",
        "signup": "Create an account to continue.",
        "password": "Never share your password.",
        "security": "Security is very important.",
        "privacy": "Your privacy matters.",

        "congratulations": "Congratulations!",
        "congrats": "Well done!",
        "success": "That's great news!",
        "failed": "Don't worry, try again.",

        "exam": "Prepare well and stay calm.",
        "study": "Consistency matters in studying.",
        "motivate me": "Small progress every day leads to big results.",
        "motivation": "Keep going—you’re improving daily.",
        "lazy": "Start with just 5 minutes.",
        "focus": "Remove distractions and begin.",

        "who am i": "Only you can define yourself.",
        "life": "Life is a journey of growth.",
        "future": "The future depends on what you do today.",
        "success quote": "Success comes from consistent effort.",
        "quote": "Believe in yourself and keep moving forward.",

        "gn": "Good night!",
        "gm": "Good morning!",
        "ge": "Good evening!",
        "afk": "Okay, see you later.",
        "brb": "Sure, I'll be here.",
        "lol": "😄",
        "haha": "Glad you're smiling.",
        "hehe": "😊",

        "test": "Test successful.",
        "ping": "Pong!",
        "status": "System is operational.",
        "online": "Yes, I am online.",
        "alive": "Yes, I'm active and ready."
    }

    return static_responses.get(msg)

def classify_by_rules(message: str) -> str:
    """Pre-classifies messages by size and keywords before sending to LLM router."""
    msg = message.lower().strip()

    complex_keywords = [
        "analyze",
        "compare",
        "design",
        "architecture",
        "optimize",
        "debug",
        "medical",
        "finance",
        "algorithm",
        "system"
    ]

    if len(msg) > 500:
        return "complex"

    if any(word in msg for word in complex_keywords):
        return "complex"

    if len(msg) < 50:
        return "simple"

    return "uncertain"

def llm_router(message: str) -> str:
    """Utilizes a fast LLM to categorize query complexity."""
    # Note: We will route this locally through the LiteLLM Router import
    from services.llm_service import router
    
    response = router.completion(
        model="fast-tier",
        messages=[
            {"role": "system", "content": ROUTER_SYSTEM_PROMPT},
            {"role": "user", "content": message}
        ]
    )

    decision = response.choices[0].message.content.strip().upper()
    return decision
