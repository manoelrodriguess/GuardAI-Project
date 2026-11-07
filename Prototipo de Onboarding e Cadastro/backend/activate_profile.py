"""Ativa, localmente, uma conta para um cadastro criado antes da implementação de senhas."""
import argparse
from getpass import getpass
import sqlite3
from main import connect_database, initialize_database, password_hash, phone_key

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--list", action="store_true", help="Listar cadastros antigos ainda sem senha")
parser.add_argument("--profile-id", type=int)
args = parser.parse_args()
initialize_database()
with connect_database() as connection:
    if args.list:
        for row in connection.execute("SELECT p.id,p.name,p.phone,p.account_type FROM profiles p LEFT JOIN accounts a ON a.profile_id=p.id WHERE a.profile_id IS NULL ORDER BY p.id"):
            print(f"{row['id']} | {row['name']} | {row['phone']} | {row['account_type']}")
    elif args.profile_id:
        row = connection.execute("SELECT * FROM profiles WHERE id=?", (args.profile_id,)).fetchone()
        if not row:
            parser.exit(1, "Cadastro não encontrado.\n")
        if connection.execute("SELECT 1 FROM accounts WHERE profile_id=?", (args.profile_id,)).fetchone():
            parser.exit(1, "Este cadastro já possui uma conta. Use Entrar.\n")
        print(f"Ativando conta de {row['name']} ({row['phone']}).")
        password = getpass("Nova senha (8 a 128 caracteres): ")
        if not 8 <= len(password) <= 128 or password != getpass("Confirme a senha: "):
            parser.exit(1, "Senha inválida ou confirmação diferente.\n")
        try:
            connection.execute("INSERT INTO accounts VALUES (?,?,?)", (row['id'], phone_key(row['phone']), password_hash(password)))
        except sqlite3.IntegrityError:
            parser.exit(1, "Já existe uma conta com este telefone. Ative um cadastro com telefone diferente.\n")
        print("Conta ativada. Entre pelo site com este telefone e a nova senha.")
    else:
        parser.print_help()
