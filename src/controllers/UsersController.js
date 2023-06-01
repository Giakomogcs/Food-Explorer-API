const AppError = require("../utils/AppError")
const sqliteConnection = require('../database/sqlite')
const {hash,compare} = require("bcrypt")

class UsersController{
  async create(request,response){
    const {name, email, password, isAdmin} = request.body

    const database = await sqliteConnection()
    const checkUserExists = await database.get("SELECT * FROM users WHERE email = (?)", [email])

    if(checkUserExists){
      throw new AppError("Esse e-mail já está em uso")
    }

    const hashedPassword = await hash(password, 8)

    await database.run("INSERT INTO users (name, email, password, isAdmin) VALUES (?,?,?,?)",
    [name,email,hashedPassword,isAdmin?isAdmin:false])

    response.status(201).json({name, email, password, isAdmin})
  }

  async update(request,response){
    const {name, email, password, old_password, isAdmin} = request.body
    
    const user_id = request.user.id

    const database = await sqliteConnection()
    const user = await database.get("SELECT * FROM users WHERE id = (?)", [user_id])

    if(!user){
      throw new AppError("Usuário não encontrado")
    }

    const userWithUpdatedEmail = await database.get("SELECT * FROM users WHERE email = (?)", [email])

    if(userWithUpdatedEmail && userWithUpdatedEmail.id !== user.id){
      throw new AppError("Este e-mail já está em uso")
    }

    user.name = name ?? user.name
    user.email = email ?? user.email
    user.isAdmin = isAdmin ?? user.isAdmin

    if (password && !old_password){
      throw new AppError("Você precisa informar a senha antiga para alterar a senha.")
    }

    if (password && old_password){
      const checkOlddPassword = await compare(old_password, user.password)

      if(!checkOlddPassword){
        throw new AppError("A senha antiga não confere")
      }

      user.password = await hash(password,8)
    }


    await database.run(`
      UPDATE users SET
      name = ?,
      email = ?,
      password = ?,
      isAdmin = ?,
      updated_at = DATETIME('now')
      WHERE id = ?`,
      [user.name, user.email, user.password, user.isAdmin, user_id]
    )

    return response.status(200).json("Atualizado com sucesso!")
  }
}
module.exports = UsersController