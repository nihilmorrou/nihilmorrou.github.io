// database.js - Управление базой данных для GitHub Pages
class UustBookDB {
    constructor() {
      this.dbName = 'UustBookDB';
      this.dbVersion = 1;
      this.db = null;
      this.init();
    }
  
    async init() {
      await this.initIndexedDB();
      await this.initLocalStorage();
      await this.loadInitialData();
    }
  
    async initIndexedDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
  
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };
  
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
  
          if (!db.objectStoreNames.contains('users')) {
            const usersStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
            usersStore.createIndex('email', 'email', { unique: true });
          }
  
          if (!db.objectStoreNames.contains('groups')) {
            const groupsStore = db.createObjectStore('groups', { keyPath: 'id', autoIncrement: true });
            groupsStore.createIndex('name', 'name');
          }
  
          if (!db.objectStoreNames.contains('materials')) {
            const materialsStore = db.createObjectStore('materials', { keyPath: 'id', autoIncrement: true });
            materialsStore.createIndex('title', 'title');
          }
  
          if (!db.objectStoreNames.contains('groupMembers')) {
            const membersStore = db.createObjectStore('groupMembers', { keyPath: 'id', autoIncrement: true });
            membersStore.createIndex('userId', 'userId');
            membersStore.createIndex('groupId', 'groupId');
            membersStore.createIndex('userId_groupId', ['userId', 'groupId'], { unique: true });
          }
  
          if (!db.objectStoreNames.contains('groupMessages')) {
            const messagesStore = db.createObjectStore('groupMessages', { keyPath: 'id', autoIncrement: true });
            messagesStore.createIndex('groupId', 'groupId');
            messagesStore.createIndex('createdAt', 'createdAt');
          }
        };
      });
    }
  
    initLocalStorage() {
      if (!localStorage.getItem('currentUser')) {
        localStorage.setItem('currentUser', JSON.stringify(null));
      }
      if (!localStorage.getItem('dataLoaded')) {
        localStorage.setItem('dataLoaded', 'false');
      }
    }
  
    async loadInitialData() {
      // Проверяем, загружали ли уже данные
      const dataLoaded = localStorage.getItem('dataLoaded') === 'true';
      if (dataLoaded) return;
  
      try {
        // Загружаем данные из JSON файла
        const response = await fetch('data.json');
        const initialData = await response.json();
  
        // Загружаем группы
        const groups = await this.getAll('groups');
        if (groups.length === 0 && initialData.groups) {
          for (const group of initialData.groups) {
            await this.add('groups', {
              name: group.name,
              members: group.members,
              messages: group.messages,
              description: group.description
            });
          }
        }
  
        // Загружаем материалы
        const materials = await this.getAll('materials');
        if (materials.length === 0 && initialData.materials) {
          for (const material of initialData.materials) {
            await this.add('materials', {
              title: material.title,
              size: material.size,
              downloads: material.downloads || 0
            });
          }
        }
  
        // Создаем тестового пользователя
        const users = await this.getAll('users');
        if (users.length === 0) {
          await this.add('users', {
            fullname: 'Тестовый Пользователь',
            email: 'test@example.com',
            password: '123456',
            createdAt: new Date().toISOString()
          });
        }
  
        localStorage.setItem('dataLoaded', 'true');
      } catch (error) {
        console.error('Ошибка загрузки начальных данных:', error);
        // Если файл data.json не найден, используем данные по умолчанию
        await this.loadDefaultData();
      }
    }
  
    async loadDefaultData() {
      const groups = await this.getAll('groups');
      if (groups.length === 0) {
        const mockGroups = [
          { name: 'Blender3D', members: 10, messages: 23145, description: '3D моделирование и анимация' },
          { name: 'Unity community', members: 8, messages: 57335, description: 'Разработка игр на Unity' },
          { name: 'Питонисты', members: 14, messages: 17451, description: 'Программирование на Python' },
          { name: 'Русский рок', members: 26, messages: 94145, description: 'Обсуждение русской рок-музыки' },
          { name: 'Клуб линуксоидов', members: 7, messages: 43167, description: 'Linux и open source' },
          { name: 'Скриптовая автоматизация', members: 63, messages: 55115, description: 'Автоматизация задач' }
        ];
  
        for (const group of mockGroups) {
          await this.add('groups', group);
        }
      }
  
      const materials = await this.getAll('materials');
      if (materials.length === 0) {
        const mockMaterials = [
          { title: 'Политология. Учебник для студентов вузов (2013)', size: '1605 кб', downloads: 0 },
          { title: 'Матяш, Жаров, Несмеянов. Философия. Учебник', size: '8705 кб', downloads: 0 },
          { title: 'История России (2-е издание)', size: '2195 кб', downloads: 0 },
          { title: 'Курс высшей математики (1991)', size: '641 кб', downloads: 0 }
        ];
  
        for (const material of mockMaterials) {
          await this.add('materials', material);
        }
      }
    }
  
    // ... (остальные методы остаются теми же)
    
    async getAll(storeName) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
  
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  
    async add(storeName, data) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);
  
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  
    async getById(storeName, id) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
  
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  
    async update(storeName, data) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
  
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  
    async getByIndex(storeName, indexName, value) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);
  
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
  
    async getUserByEmail(email) {
      const users = await this.getByIndex('users', 'email', email);
      return users[0] || null;
    }
  
    async registerUser(userData) {
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('Пользователь с таким email уже существует');
      }
      userData.createdAt = new Date().toISOString();
      return await this.add('users', userData);
    }
  
    async loginUser(email, password) {
      const user = await this.getUserByEmail(email);
      if (user && user.password === password) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
      }
      throw new Error('Неверный email или пароль');
    }
  
    getCurrentUser() {
      const userJson = localStorage.getItem('currentUser');
      return userJson ? JSON.parse(userJson) : null;
    }
  
    logout() {
      localStorage.setItem('currentUser', JSON.stringify(null));
    }
  
    async joinGroup(userId, groupId) {
      try {
        const existing = await this.getByIndex('groupMembers', 'userId_groupId', [userId, groupId]);
        if (existing.length > 0) {
          throw new Error('Вы уже состоите в этой группе');
        }
  
        await this.add('groupMembers', { userId, groupId, joinedAt: new Date().toISOString() });
  
        const group = await this.getById('groups', groupId);
        if (group) {
          group.members += 1;
          await this.update('groups', group);
        }
        
        return true;
      } catch (error) {
        throw error;
      }
    }
  
    async getUserGroups(userId) {
      const memberships = await this.getByIndex('groupMembers', 'userId', userId);
      const groups = [];
      for (const membership of memberships) {
        const group = await this.getById('groups', membership.groupId);
        if (group) {
          groups.push(group);
        }
      }
      return groups;
    }
  
    async addMessage(groupId, userId, text) {
      const message = {
        groupId,
        userId,
        text,
        createdAt: new Date().toISOString()
      };
      const messageId = await this.add('groupMessages', message);
      
      const group = await this.getById('groups', groupId);
      if (group) {
        group.messages += 1;
        await this.update('groups', group);
      }
      
      return messageId;
    }
  
    async getGroupMessages(groupId) {
      const messages = await this.getByIndex('groupMessages', 'groupId', groupId);
      return messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
  
    async downloadMaterial(materialId) {
      const material = await this.getById('materials', materialId);
      if (material) {
        material.downloads += 1;
        await this.update('materials', material);
      }
      return material;
    }
  
    async searchMaterials(query) {
      const materials = await this.getAll('materials');
      if (!query) return materials;
      
      query = query.toLowerCase();
      return materials.filter(m => 
        m.title.toLowerCase().includes(query)
      );
    }
  
    async addMaterial(materialData) {
      materialData.createdAt = new Date().toISOString();
      materialData.downloads = 0;
      return await this.add('materials', materialData);
    }
  }
  
  // Создаем глобальный экземпляр базы данных
  const db = new UustBookDB();