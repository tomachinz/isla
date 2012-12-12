var interpreter = require('../src/interpreter').Interpreter;

var newObj = function(type, data) {
  var obj = { _meta: { type: type } };
  for(var i in data) {
    obj[i] = data[i];
  }

  return obj;
};

describe('interpreter', function() {
  describe('assignment to scalar', function(){
    it('should assign an integer', function() {
      var env = interpreter.interpret("mary is 1");
      expect(env.ctx["mary"]).toEqual(1);
    });

    it('should create ref for non-canonical var that points at value', function() {
      var env = interpreter.interpret("mary is a person\nfriend is mary");
      expect(env.ctx["friend"]).toEqual({ ref: "mary" });
    });
  });

  describe('reference updating', function(){
    it('should produce right data if follow scalar ref made before obj updated', function() {
      var code = "isla is a person\nfriend is isla\nisla age is 1";
      var env = interpreter.interpret(code);
      expect(interpreter.resolve({ ref: "friend" }, env).age).toEqual(1);
    });

    it('should produce right data if follow attr ref made before obj updated', function() {
      var code = "isla is a person\nmary is a person\nmary friend is isla\nisla age is 1";
      var env = interpreter.interpret(code);
      expect(interpreter.resolve({ ref: "mary" }, env).friend.age).toEqual(1);
    });

    it('should update original when ref attr changed', function() {
      var code = "mary is a person\na is mary\na age is 1";
      var env = interpreter.interpret(code);
      expect(env.ctx.mary.age).toEqual(1);
      expect(interpreter.resolve({ ref:"a" }, env).age).toEqual(1);
    });
  });

  describe('assignment, references and object types', function(){
    describe('scalars', function(){
      it('should copy by value when integer assigned', function() {
        var code = "a is 1\nb is a\na is 2";
        var env = interpreter.interpret(code);
        expect(env.ctx.a).toEqual(2);
        expect(env.ctx.b).toEqual(1);
      });

      it('should copy by value when string assigned', function() {
        var code = "a is '1'\nb is a\na is '2'";
        var env = interpreter.interpret(code);
        expect(env.ctx.a).toEqual("2");
        expect(env.ctx.b).toEqual("1");
      });

      it('should use ref when obj assigned', function() {
        var code = "mary is a person\na is mary\nb is mary\na age is 1";
        var env = interpreter.interpret(code);
        expect(interpreter.resolve(env.ctx.a, env).age).toEqual(1);
        expect(interpreter.resolve(env.ctx.b, env).age).toEqual(1);
      });
    });

    describe('scalar assigned to object attribute', function(){
      it('should copy by value when integer assigned', function() {
        var code = "mary is a person\nx is 1\nmary age is x\nx is 2";
        var env = interpreter.interpret(code);
        expect(env.ctx.mary.age).toEqual(1);
        expect(env.ctx.x).toEqual(2);
      });

      it('should use ref when obj assigned', function() {
        var code = "x is a person\ny is a person\ny age is 1\nx friend is y\ny age is 2";
        var env = interpreter.interpret(code);
        expect(interpreter.resolve(env.ctx.x.friend, env).age).toEqual(2);
        expect(env.ctx.y.age).toEqual(2);
      });
    });

    describe('object attribute assigned to scalar', function(){
      it('should copy when obj primitive obj attr assigned', function() {
        var code = "x is a person\nx age is 1\ny is x age\nx age is 2";
        var env = interpreter.interpret(code);
        expect(env.ctx.x.age).toEqual(2);
        expect(env.ctx.y).toEqual(1);
      });

      // not possible - can't syntax does not allow x friend age is 2
      it('should use ref when obj assigned', function() {});
    });

    describe('object attribute assigned to object attribute', function(){
      it('should copy when obj primitive obj attr assigned', function() {
        var code = "x is a person\ny is a person\nx age is 1\ny age is x age\nx age is 2";
        var env = interpreter.interpret(code);
        expect(env.ctx.x.age).toEqual(2);
        expect(env.ctx.y.age).toEqual(1);
      });

      // not possible - can't syntax does not allow x friend age is 2
      it('should use ref when obj assigned', function() {});
    });
  });

  describe('invocation', function(){
    it('should return result of invocation', function() {
      var env = interpreter.interpret("write 2");
      expect(env.ret).toEqual(2);
    });

    it('should return result of last invocation', function() {
      var env = interpreter.interpret("write 2\nwrite 3");
      expect(env.ret).toEqual(3);
    });

    it('should not return null if expression does not return anything', function() {
      var env = interpreter.interpret("write 2\nage is 1");
      expect(env.ret).toEqual(null);
    });

    it('should accept scalar as param', function() {
      var env = interpreter.interpret("age is 1\nwrite age");
      expect(env.ret).toEqual(1);
    });

    it('should accept object attribute as param', function() {
      var code = "mary is a person\nmary age is 2\nwrite mary age";
      var env = interpreter.interpret(code);
      expect(env.ret).toEqual(2);
    });
  });

  describe('type assignment', function(){
    it('should be able to make generic type', function() {
      var env = interpreter.interpret("isla is a person");
      expect(env.ctx.isla).toEqual(newObj("person"));
    });
  });

  describe('slot assignment', function(){
    it('should be able to assign value to slot', function() {
      var env = interpreter.interpret("isla is a person\nisla age is 1");
      expect(env.ctx.isla.age).toEqual(1);
    });

    it('should be able to assign value to slot and retain other slot vals', function() {
      var code = "isla is a person\nisla name is 'isla'\nisla age is 1";
      var env = interpreter.interpret(code);
      expect(env.ctx.isla.name).toEqual("isla");
    });

    it('should be able to assign slot with obj instantiation', function() {
      var code = "isla is a person\nisla friend is a person";
      var env = interpreter.interpret(code);
      expect(env.ctx.isla.friend).toEqual(newObj("person"));
    });
  });

  describe('lists', function() {
    describe('instantiation', function(){
      it('should be able to instantiate a list', function() {
        var env = interpreter.interpret("items is a list");
        expect(env.ctx.items.items()).toEqual([]);
      });
    });

    describe('non existent', function(){
      it('should get error if try and use non-existent list', function() {
        expect(function(){
          interpreter.interpret("add 'sword' to items");
        }).toThrow("I do not know of a list called items.");
      });

      it('should get error if try and use non-existent list', function() {
        expect(function(){
          interpreter.interpret("add 1 to isla items");
        }).toThrow("I do not know of a list called isla items.");
      });
    });

    describe('addition', function() {
      it('should be able to add to a list', function() {
        var env = interpreter.interpret("items is a list\nadd 'sword' to items");
        expect(interpreter.resolve({ ref:"items" }, env).items()).toEqual(["sword"]);
      });

      it('should be able to add obj to a list', function() {
        var code = "items is a list\nmary is a person\nadd mary to items";
        var env = interpreter.interpret(code);
        expect(env.ctx.items.items()).toEqual([{ ref: "mary" }]);
      });

      it('should be able to add dupe string to list', function() {
        var code = "items is a list\nadd 'sword' to items\nadd 'sword' to items";
        var env = interpreter.interpret(code);
        expect(interpreter.resolve({ ref:"items" }, env).items()).toEqual(["sword", "sword"]);
      });

      it('should be able to add dupe int to list', function() {
        var code = "items is a list\nadd 1 to items\nadd 1 to items";
        var env = interpreter.interpret(code);
        expect(interpreter.resolve({ ref:"items" }, env).items()).toEqual([1, 1]);
      });

      it('should do nothing if add same obj twice', function() {
        var code = "mary is a person\nitems is a list\nadd mary to items\nadd mary to items";
        var env = interpreter.interpret(code);
        expect(interpreter.resolve({ ref:"items" }, env).items()).toEqual([newObj("person")]);
      });

      it('should be able to add item to list that is an attr', function() {
        var code = "isla is a person\nisla items is a list\nadd 1 to isla items";
        var env = interpreter.interpret(code);
        expect(interpreter.resolve({ ref:"isla" }, env).items.items()).toEqual([1]);
      });
    });

    describe('removal', function() {
      it('should be able to take string from a list', function() {
        var code = "items is a list\nadd 'sword' to items\ntake 'sword' from items";
        var env = interpreter.interpret(code);
        expect(interpreter.resolve({ ref:"items" }, env).items()).toEqual([]);
      });

      it('should be able to take ref from a list', function() {
        var code = "items is a list\nmary is a person\nadd mary to items\ntake mary from items";
        var env = interpreter.interpret(code);
        expect(env.ctx.items.items()).toEqual([]);
      });

      it('should do nothing if try to take non-existent string from list', function() {
        var code = "items is a list\nadd 'a' to items\ntake 'b' from items";
        var env = interpreter.interpret(code);
        expect(interpreter.resolve({ ref:"items" }, env).items()).toEqual(["a"]);
      });

      it('should do nothing if try to take non-existent obj from list', function() {
        var code = "mary is a person\nmary age is '1'\nisla is a person\nitems is a list\nadd isla to items\nadd mary to items\ntake mary from items";
        var env = interpreter.interpret(code);
        expect(interpreter.resolve({ ref:"items" }, env).items()).toEqual([newObj("person")]);
      });
    });
  });
});
